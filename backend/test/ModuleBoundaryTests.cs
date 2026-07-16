namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial;
using PSeq.Operations.Laboratory;
using PhaenoPortal.App.Infrastructure.Persistence;

public class ModuleBoundaryTests
{
    [Fact]
    public void CommercialAndLaboratoryAssembliesDoNotReferenceEachOtherOrApi()
    {
        var commercialAssembly = typeof(CommercialAssembly).Assembly;
        var laboratoryAssembly = typeof(LaboratoryAssembly).Assembly;
        var apiAssembly = typeof(PSeqOperationsDbContext).Assembly;

        Assert.DoesNotContain(
            commercialAssembly.GetReferencedAssemblies(),
            reference => reference.Name == laboratoryAssembly.GetName().Name);
        Assert.DoesNotContain(
            commercialAssembly.GetReferencedAssemblies(),
            reference => reference.Name == apiAssembly.GetName().Name);
        Assert.DoesNotContain(
            laboratoryAssembly.GetReferencedAssemblies(),
            reference => reference.Name == commercialAssembly.GetName().Name);
        Assert.DoesNotContain(
            laboratoryAssembly.GetReferencedAssemblies(),
            reference => reference.Name == apiAssembly.GetName().Name);
    }
}
