namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial;
using PSeq.Operations.Laboratory;

public class ModuleBoundaryTests
{
    [Fact]
    public void CommercialAndLaboratoryAssembliesDoNotReferenceEachOther()
    {
        var commercialAssembly = typeof(CommercialAssembly).Assembly;
        var laboratoryAssembly = typeof(LaboratoryAssembly).Assembly;

        Assert.DoesNotContain(
            commercialAssembly.GetReferencedAssemblies(),
            reference => reference.Name == laboratoryAssembly.GetName().Name);
        Assert.DoesNotContain(
            laboratoryAssembly.GetReferencedAssemblies(),
            reference => reference.Name == commercialAssembly.GetName().Name);
    }
}
